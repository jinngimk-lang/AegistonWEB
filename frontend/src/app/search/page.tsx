import type { Metadata } from 'next';
import Link from 'next/link';

import { SearchResults } from '@/components/search/SearchResults';
import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Reveal } from '@/components/ui/Reveal';
import { getSearchIndex } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import {
  GROUP_LABELS,
  GROUP_ORDER,
  buildRuntimeIndex,
  countHits,
  search,
  type RuntimeIndex,
  type SearchDocType,
} from '@/lib/search';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

const DESCRIPTION = '在产品、行业实践、技术模块与洞察文章中检索。支持 ⌘K / Ctrl K 随处唤起。';

/**
 * 模块级构建一次，跨请求复用。
 *
 * 倒排表的构建成本是 O(全文长度)，只应该付一次；放进请求处理函数里就变成
 * 每个请求都重切一遍全站文本（v3 P0-3 / R16）。
 */
let runtime: RuntimeIndex | null = null;
function getRuntime(): RuntimeIndex {
  if (!runtime) runtime = buildRuntimeIndex(getSearchIndex());
  return runtime;
}

interface PageProps {
  searchParams: Promise<{ q?: string; type?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const base = pageMetadata({
    title: q ? `检索「${q}」` : '站内检索',
    description: DESCRIPTION,
    path: ROUTES.search,
  });
  // 有 q 时 noindex：搜索结果页被索引是典型的重复内容 / 软 404 来源。
  // 无 q 时可索引 —— 它是一个有价值的检索入口页。
  //
  // ⚠️ q 只经 Next 的 metadata 通道（自动转义），**不得**走 metadata.other
  // 之类的裸字符串通道，也**不得**进任何 JSON-LD（v3 §4.2.7 S2/S3）。
  return { ...base, robots: q ? { index: false, follow: true } : { index: true, follow: true } };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '', type } = await searchParams;
  const query = q.slice(0, 120);
  const activeType = GROUP_ORDER.includes(type as SearchDocType)
    ? (type as SearchDocType)
    : undefined;

  const groups = query.trim() ? search(getRuntime(), query, { type: activeType }) : [];
  const total = countHits(groups);

  // ⚠️ 面包屑末节固定为字面量「站内检索」，**不含 q**。
  // 面包屑会进 JSON-LD，而 `JSON.stringify` 不转义 `<` 与 `/`，
  // 一个 `</script>` 就能闭合标签 —— 这才是真正的注入点（v3 §4.2.7 S2）。
  const crumbs = crumbsFromPath(ROUTES.search);

  return (
    <>
      {/* 本页**没有 JSON-LD**：查询串是全站唯一的用户输入回显点，
          任何把它塞进 <script type="application/ld+json"> 的做法都不安全。 */}
      {/* ⚠️ 本页**刻意不取 hero 配图**（`getMediaLookup()`），这是无 JS 可用性的
          一部分，不是漏写。本页是动态路由（要 `await searchParams`），只要页面里
          还有一次真实网络等待，Next 就可能先冲刷外壳、把正文塞进 `<div hidden>`，
          再靠**内联脚本**搬进 DOM —— 那段搬运脚本需要 JS，于是
          `javaScriptEnabled: false` 的访客看到的是空壳。而「无 JS 也能用」正是
          这个页面存在的理由之一（§4.2.5）。
          （根部的 `app/loading.tsx` 曾经无条件制造这个 Suspense 边界，v3 已按
          B-1 删除；这里不取数是**第二道**保险，也让检索不依赖 API 可达性 —— 见
          `tests/e2e/offline-api.spec.ts`。）
          实测由 `tests/e2e/search.spec.ts` 的「无 JS 也能用」用例守住。 */}
      <PageHero eyebrow="SEARCH" title="站内检索" subtitle={DESCRIPTION} />
      <Breadcrumbs items={crumbs} />

      <section className="section" aria-label="检索">
        <div className="container">
          <div className="search-layout">
            {/* 原生 form + method=get：**无 JS 也能用**。命令面板是增强，不是前提。 */}
            <form className="search-form" method="get" action={ROUTES.search} role="search">
              <label className="search-label" htmlFor="site-search-input">
                检索关键词
              </label>
              <div className="search-field">
                <input
                  id="site-search-input"
                  className="search-input"
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="例如：合约智审、私有化部署、多智能体"
                  autoComplete="off"
                  maxLength={120}
                />
                <button type="submit" className="btn btn-primary btn-compact">
                  检索
                  <span className="arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
              {activeType ? <input type="hidden" name="type" value={activeType} /> : null}
            </form>

            <nav className="search-filters" aria-label="按类型筛选">
              <Link
                href={query ? `${ROUTES.search}?q=${encodeURIComponent(query)}` : ROUTES.search}
                aria-current={activeType ? undefined : 'true'}
              >
                全部
              </Link>
              {GROUP_ORDER.map((groupType) => (
                <Link
                  key={groupType}
                  href={`${ROUTES.search}?q=${encodeURIComponent(query)}&type=${groupType}`}
                  aria-current={activeType === groupType ? 'true' : undefined}
                >
                  {GROUP_LABELS[groupType]}
                </Link>
              ))}
            </nav>

            <Reveal>
              {query.trim() ? (
                <p className="search-summary">
                  {/* 查询串只经文本节点渲染 —— React 对文本节点做转义（S1） */}
                  找到 <strong>{total}</strong> 条与「{query}」相关的内容
                </p>
              ) : (
                <p className="search-summary">输入关键词开始检索，或按 ⌘K / Ctrl K 随处唤起命令面板。</p>
              )}
            </Reveal>

            {query.trim() && total === 0 ? (
              <div className="search-empty">
                <h2>没有匹配到内容</h2>
                <p>换一个说法，或从下面这几个出口继续：</p>
                <div className="search-exits">
                  <Link href={ROUTES.sitemap} className="btn btn-outline btn-compact">
                    浏览网站地图
                  </Link>
                  <Link href={ROUTES.contact} className="btn btn-outline btn-compact">
                    直接联系我们
                  </Link>
                  <Link href={ROUTES.search} className="btn-text">
                    清空重试 <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            ) : null}

            {total > 0 ? <SearchResults groups={groups} query={query} variant="page" /> : null}
          </div>
        </div>
      </section>
    </>
  );
}
