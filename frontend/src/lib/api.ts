/**
 * 类型化 API 客户端：超时 / 重试 / 快照兜底 / tag 缓存。
 *
 * 路径 A（spec §4.2）：
 *   1. `AbortController` 超时 3000 ms
 *   2. 失败重试 1 次（退避 250 ms）
 *   3. 两次都失败 → `loadSnapshot()` 读 `src/content/snapshot/*.json`，
 *      并 `console.warn` + 打点
 *
 * 这是 R12「后端挂了官网仍然可访问」的实现落点。配合 §11.2 把
 * `depends_on` 降为 `service_started`，api **从未启动**的冷启动场景也能出 200。
 */

import 'server-only';

import { getSnapshot, type SnapshotKey } from '@/content/snapshot';
import type {
  AboutPage,
  CareersPage,
  DeploymentPage,
  HomePage,
  InsightDetail,
  InsightSummary,
  MediaManifest,
  Navigation,
  Page,
  PapersPage,
  ProductDetail,
  ProductsOverview,
  ResearchOverview,
  RoutesPayload,
  SiteSettings,
  SolutionDetail,
  SolutionsOverview,
  TeamPage,
} from '@/types/content';
import type { InsightCategory, ProductSlug, SolutionSlug } from '@/lib/routes';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8000';
const TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS ?? 3000);
const RETRY_BACKOFF_MS = 250;
const SNAPSHOT_STALE_DAYS = 30;

export interface FetchOptions {
  revalidate?: number | false;
  tags?: string[];
  snapshot?: SnapshotKey;
}

class ApiUnavailableError extends Error {
  constructor(
    readonly path: string,
    readonly cause?: unknown,
  ) {
    super(`API 不可用：${path}`);
    this.name = 'ApiUnavailableError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function once<T>(path: string, options: FetchOptions): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: {
        revalidate: options.revalidate ?? 300,
        tags: options.tags ?? [],
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 取数据。失败两次后退回快照；快照也没有则抛出，交给 `error.tsx` 边界。
 */
export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await once<T>(path, options);
    } catch (error) {
      lastError = error;
      if (attempt === 0) await sleep(RETRY_BACKOFF_MS);
    }
  }

  if (options.snapshot) {
    const fallback = getSnapshot<T>(options.snapshot);
    if (fallback) {
      const meta = fallback as unknown as { _contentHash?: string; _generatedAt?: string };
      // eslint-disable-next-line no-console
      console.warn(
        `[api] ${path} 不可达，已降级到快照 ` +
          `contentHash=${meta._contentHash ?? '?'} generatedAt=${meta._generatedAt ?? '?'}`,
      );
      if (meta._generatedAt) {
        const ageDays = (Date.now() - Date.parse(meta._generatedAt)) / 86_400_000;
        if (ageDays > SNAPSHOT_STALE_DAYS) {
          // eslint-disable-next-line no-console
          console.warn(
            `[api] 快照已陈旧 ${Math.round(ageDays)} 天（> ${SNAPSHOT_STALE_DAYS}），` +
              '请在 CI 中重新生成（npm run content:snapshot）',
          );
        }
      }
      return fallback;
    }
  }

  throw new ApiUnavailableError(path, lastError);
}

/* ------------------------------------------------------------------ 站点级 */

export const getSiteSettings = () =>
  apiFetch<SiteSettings>('/api/v1/site/settings', {
    revalidate: 3600,
    tags: ['site'],
    snapshot: 'site-settings',
  });

export const getNavigation = () =>
  apiFetch<Navigation>('/api/v1/site/navigation', {
    revalidate: 3600,
    tags: ['site'],
    snapshot: 'site-navigation',
  });

export const getRoutes = () =>
  apiFetch<RoutesPayload>('/api/v1/site/routes', {
    revalidate: 3600,
    tags: ['site'],
    snapshot: 'site-routes',
  });

export const getMediaManifest = () =>
  apiFetch<MediaManifest>('/api/v1/media/manifest', {
    revalidate: 3600,
    tags: ['media'],
    snapshot: 'media-manifest',
  });

/* -------------------------------------------------------------------- 首页 */

export const getHome = () =>
  apiFetch<HomePage>('/api/v1/home', {
    revalidate: 300,
    tags: ['home', 'insights'],
    snapshot: 'home',
  });

/* -------------------------------------------------------------------- 产品 */

export const getProducts = () =>
  apiFetch<ProductsOverview>('/api/v1/products', {
    revalidate: 600,
    tags: ['products'],
    snapshot: 'products',
  });

export const getProduct = (slug: ProductSlug) =>
  apiFetch<ProductDetail>(`/api/v1/products/${slug}`, {
    revalidate: 600,
    tags: ['products', `product:${slug}`],
    snapshot: `product-${slug}` as SnapshotKey,
  });

export const getDeployment = () =>
  apiFetch<DeploymentPage>('/api/v1/products/deployment', {
    revalidate: 3600,
    tags: ['products'],
    snapshot: 'products-deployment',
  });

/* -------------------------------------------------------------------- 行业 */

export const getSolutions = () =>
  apiFetch<SolutionsOverview>('/api/v1/solutions', {
    revalidate: 600,
    tags: ['solutions'],
    snapshot: 'solutions',
  });

export const getSolution = (slug: SolutionSlug) =>
  apiFetch<SolutionDetail>(`/api/v1/solutions/${slug}`, {
    revalidate: 3600,
    tags: ['solutions', `solution:${slug}`],
    snapshot: `solution-${slug}` as SnapshotKey,
  });

/* -------------------------------------------------------------------- 研究 */

export const getResearch = () =>
  apiFetch<ResearchOverview>('/api/v1/research/pillars', {
    revalidate: 3600,
    tags: ['research'],
    snapshot: 'research-pillars',
  });

export const getPapers = () =>
  apiFetch<PapersPage>('/api/v1/research/papers', {
    revalidate: 3600,
    tags: ['research'],
    snapshot: 'research-papers',
  });

/* -------------------------------------------------------------------- 关于 */

export const getAbout = () =>
  apiFetch<AboutPage>('/api/v1/about', {
    revalidate: 3600,
    tags: ['about'],
    snapshot: 'about',
  });

export const getTeam = () =>
  apiFetch<TeamPage>('/api/v1/about/team', {
    revalidate: 3600,
    tags: ['about'],
    snapshot: 'about-team',
  });

export const getCareers = () =>
  apiFetch<CareersPage>('/api/v1/about/careers', {
    revalidate: 3600,
    tags: ['about'],
    snapshot: 'about-careers',
  });

/* -------------------------------------------------------------------- 洞察 */

export async function getInsights(
  params: { category?: InsightCategory; page?: number; pageSize?: number } = {},
): Promise<Page<InsightSummary>> {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  search.set('page', String(params.page ?? 1));
  search.set('pageSize', String(params.pageSize ?? 9));

  const all = await apiFetch<Page<InsightSummary>>(`/api/v1/insights?${search.toString()}`, {
    revalidate: 300,
    tags: ['insights'],
    snapshot: 'insights',
  });

  // 快照兜底路径下拿到的是完整列表，需要在本地重新过滤 / 分页
  if (params.category && all.items.some((i) => i.category !== params.category)) {
    const pool = all.items.filter((i) => i.category === params.category);
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 9;
    const start = (page - 1) * pageSize;
    return {
      items: pool.slice(start, start + pageSize),
      total: pool.length,
      page,
      pageSize,
      hasNext: start + pageSize < pool.length,
    };
  }
  return all;
}

export async function getInsight(slug: string): Promise<InsightDetail | null> {
  try {
    return await apiFetch<InsightDetail>(`/api/v1/insights/${slug}`, {
      revalidate: 300,
      tags: ['insights', `insight:${slug}`],
    });
  } catch {
    const snap = getSnapshot<{ items: InsightDetail[] }>('insights-detail');
    return snap?.items.find((p) => p.slug === slug) ?? null;
  }
}

export { ApiUnavailableError };
