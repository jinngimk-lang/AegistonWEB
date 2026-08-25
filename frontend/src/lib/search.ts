/**
 * 站内检索：分词、打分、排序、分组 —— **全站唯一实现**（v3 spec §4.2.1 / A-1）。
 *
 * 检索需要在两处运行：`/search` 页（Server Component，Node 环境，SSR 出结果给
 * 爬虫和无 JS 用户）与 ⌘K 面板（浏览器）。朴素做法是「后端 Python 打分 +
 * 前端 TS 打分」两份实现 —— **明确否决**：两份排序算法会在中文分词边界、
 * 字段权重、同分排序上无声漂移，表现为「同一个词在 /search 页和 ⌘K 里排序
 * 不同」，而且没有任何测试会发现。所以打分只在这里实现一次，后端只负责把
 * 内容包摊平成文档列表（`backend/app/services/search.py`）。
 *
 * 本文件是**纯函数、无 DOM 依赖**：Node 与浏览器行为逐字相同。
 *
 * ⚠️ 按键路径上不允许再分词（v3 P0-3 / R16）。索引 JSON 里只存原文，
 * `buildRuntimeIndex()` 在索引落地那一刻**一次性**建好倒排表；
 * 此后每次按键只做「查 postings → 合并 → 排序」，代价与文档总量无关。
 */

export type SearchDocType = 'product' | 'solution' | 'research' | 'insight' | 'page';

export interface SearchDoc {
  id: string;
  type: SearchDocType;
  title: string;
  subtitle?: string | null;
  href: string;
  excerpt: string;
  keywords: string[];
  body: string;
  sourceSlides: number[];
}

export interface SearchIndex {
  version: number;
  contentHash: string;
  generatedAt: string;
  docs: SearchDoc[];
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
  matchedTokens: string[];
}

export interface SearchGroup {
  type: SearchDocType;
  label: string;
  hits: SearchHit[];
}

/** 字段权重。标题命中远比正文命中重要，但正文仍然要能召回。 */
export const FIELD_WEIGHTS = {
  title: 6,
  subtitle: 3,
  keywords: 3,
  excerpt: 2,
  body: 1,
} as const;

export type SearchField = keyof typeof FIELD_WEIGHTS;

const FIELDS: SearchField[] = ['title', 'subtitle', 'keywords', 'excerpt', 'body'];

/**
 * 类型加权。产品页是访客最常找的东西，同分时排前面。
 * 数值刻意留在 1.0–1.15 的窄区间：它只用来打破同分，不该压过字段权重。
 */
const TYPE_BOOST: Record<SearchDocType, number> = {
  product: 1.15,
  solution: 1.1,
  research: 1.05,
  insight: 1.0,
  page: 1.0,
};

/** 分组顺序固定，否则 E2E 无法断言。 */
export const GROUP_ORDER: SearchDocType[] = ['product', 'solution', 'research', 'insight', 'page'];

export const GROUP_LABELS: Record<SearchDocType, string> = {
  product: '产品',
  solution: '行业实践',
  research: '技术与研究',
  insight: '洞察与动态',
  page: '站点页面',
};

/** 词频饱和上限：防止一篇长文靠反复出现某词压过标题精确命中。 */
const TF_CAP = 3;
const PHRASE_BONUS = 8;
const PREFIX_BONUS = 4;

const DEFAULT_LIMIT = 20;
const DEFAULT_PER_GROUP = 8;

/** 中日韩统一表意文字 + 扩展 A。 */
const CJK_RE = /[一-鿿㐀-䶿]+/g;
const LATIN_RE = /[a-z0-9]+/g;

/** 全角标点 → 半角，避免「合约、智审」与「合约,智审」切出不同的词。 */
const FULLWIDTH_MAP: Record<string, string> = {
  '，': ',', '。': '.', '、': ',', '；': ';', '：': ':', '？': '?', '！': '!',
  '（': '(', '）': ')', '【': '[', '】': ']', '「': '"', '」': '"',
  '《': '<', '》': '>', '—': '-', '－': '-', '～': '~', '·': ' ',
};

/** 归一化：NFKC → 小写 → 全角标点转半角 → 折叠连续空白。 */
export function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[，。、；：？！（）【】「」《》—－～·]/g, (ch) => FULLWIDTH_MAP[ch] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 中英混排分词，**不引第三方分词库**（决策 A-3）。
 *
 * - 拉丁 / 数字：整词，长度 ≥ 2 才保留（`a` / `1` 这类噪声召回全站）
 * - CJK：长度 1 的片段保留单字；长度 ≥ 2 输出全部 bigram，并在片段 ≤ 6 时
 *   额外保留整段作为高权重 token（「合约智审」「智瞳安宇」这类自造词，
 *   词典切不准，整段保留反而稳）
 *
 * bigram 让中文短查询的召回稳定，代价是 token 数约等于字符数 —— 所以
 * **tokens 不落盘**，只在 `buildRuntimeIndex()` 里进内存（P0-3 / A-15）。
 */
export function tokenize(text: string): string[] {
  // 只是 `tokenizeWithRepeats()` 去重后的视图 —— 切分规则**只有那一份实现**。
  // 查询侧与建索引侧各写一遍是真会出事的那类缺陷：改了一处忘了另一处，
  // 两边切出对不上的 token，召回静默变空，而没有任何测试会红。
  return Array.from(new Set(tokenizeWithRepeats(text)));
}

export interface Posting {
  docIdx: number;
  field: SearchField;
  count: number;
}

export interface RuntimeIndex {
  docs: SearchDoc[];
  postings: Map<string, Posting[]>;
  /** 归一化后的标题，供短语 / 前缀加权直接比对，避免每次按键重复 normalize。 */
  titles: string[];
  contentHash: string;
}

function fieldText(doc: SearchDoc, field: SearchField): string {
  switch (field) {
    case 'title':
      return doc.title;
    case 'subtitle':
      return doc.subtitle ?? '';
    case 'keywords':
      return doc.keywords.join(' ');
    case 'excerpt':
      return doc.excerpt;
    case 'body':
      return doc.body;
  }
}

/**
 * 一次性构建内存倒排表。幂等、O(全文长度)、无 DOM 依赖。
 *
 * 时机：`/search` 页在 Node 里模块级构建一次（跨请求复用）；⌘K 面板在
 * **索引 fetch 落地那一刻**构建一次 —— 用户此时正看着骨架屏，
 * 约 64 000 字符的量级在 10–30 ms，完全不占用按键路径。
 */
export function buildRuntimeIndex(index: SearchIndex): RuntimeIndex {
  const postings = new Map<string, Posting[]>();
  const titles: string[] = [];

  index.docs.forEach((doc, docIdx) => {
    titles.push(normalize(doc.title));
    for (const field of FIELDS) {
      const text = fieldText(doc, field);
      if (!text) continue;
      const counts = new Map<string, number>();
      for (const token of tokenizeWithRepeats(text)) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
      for (const [token, count] of counts) {
        const bucket = postings.get(token);
        const posting: Posting = { docIdx, field, count };
        if (bucket) bucket.push(posting);
        else postings.set(token, [posting]);
      }
    }
  });

  return { docs: index.docs, postings, titles, contentHash: index.contentHash };
}

/**
 * 切分的**唯一实现**：归一化 → 拉丁整词 → CJK bigram（片段 ≤ 6 时再加整段）。
 * **保留重复**——建索引时词频就是信号；`tokenize()` 是它去重后的视图，
 * 因为查询串里的重复没有意义。
 *
 * 规则只写在这一处，理由与 §4.2.1 A-1 拒绝「后端再实现一份打分」完全同源：
 * 同一套规则写两遍，迟早在某次修改里只改了一遍。
 */
function tokenizeWithRepeats(text: string): string[] {
  const source = normalize(text);
  const out: string[] = [];
  for (const match of source.matchAll(LATIN_RE)) {
    if (match[0].length >= 2) out.push(match[0]);
  }
  for (const match of source.matchAll(CJK_RE)) {
    const segment = match[0];
    if (segment.length === 1) {
      out.push(segment);
      continue;
    }
    for (let i = 0; i + 1 < segment.length; i += 1) out.push(segment.slice(i, i + 2));
    if (segment.length <= 6) out.push(segment);
  }
  return out;
}

export interface SearchOptions {
  limit?: number;
  perGroup?: number;
  type?: SearchDocType;
}

/**
 * 检索。**入参是 `RuntimeIndex` 而不是 `SearchIndex`** —— 类型上就堵死
 * 「按键路径上重新分词」这条路（P0-3）。
 *
 * 排序必须完全确定：`score` 降序 → `title.length` 升序 → `id` 字典序升序。
 * 少了任何一级，同分项的顺序就依赖 Map 的插入顺序，E2E 会随机变红。
 */
export function search(
  runtime: RuntimeIndex,
  query: string,
  opts: SearchOptions = {},
): SearchGroup[] {
  const normalized = normalize(query);
  if (!normalized) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const limit = opts.limit ?? DEFAULT_LIMIT;
  const perGroup = opts.perGroup ?? DEFAULT_PER_GROUP;

  const scores = new Map<number, number>();
  const matched = new Map<number, Set<string>>();

  for (const token of queryTokens) {
    const bucket = runtime.postings.get(token);
    if (!bucket) continue;
    for (const posting of bucket) {
      const gain = FIELD_WEIGHTS[posting.field] * Math.min(posting.count, TF_CAP);
      scores.set(posting.docIdx, (scores.get(posting.docIdx) ?? 0) + gain);
      const seen = matched.get(posting.docIdx);
      if (seen) seen.add(token);
      else matched.set(posting.docIdx, new Set([token]));
    }
  }

  const hits: SearchHit[] = [];
  for (const [docIdx, base] of scores) {
    const doc = runtime.docs[docIdx];
    if (!doc) continue;
    if (opts.type && doc.type !== opts.type) continue;

    let score = base;
    const title = runtime.titles[docIdx] ?? '';
    if (title.includes(normalized)) score += PHRASE_BONUS;
    if (title.startsWith(normalized)) score += PREFIX_BONUS;
    score *= TYPE_BOOST[doc.type];

    hits.push({
      doc,
      score,
      matchedTokens: Array.from(matched.get(docIdx) ?? []).sort(),
    });
  }

  hits.sort(compareHits);

  const groups: SearchGroup[] = [];
  let total = 0;
  for (const type of GROUP_ORDER) {
    const inGroup: SearchHit[] = [];
    for (const hit of hits) {
      if (hit.doc.type !== type) continue;
      if (inGroup.length >= perGroup) break;
      if (total >= limit) break;
      inGroup.push(hit);
      total += 1;
    }
    if (inGroup.length > 0) {
      groups.push({ type, label: GROUP_LABELS[type], hits: inGroup });
    }
  }
  return groups;
}

function compareHits(a: SearchHit, b: SearchHit): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.doc.title.length !== b.doc.title.length) return a.doc.title.length - b.doc.title.length;
  return a.doc.id < b.doc.id ? -1 : a.doc.id > b.doc.id ? 1 : 0;
}

/** 结果总数，供 `aria-live` 播报「找到 N 条结果」。 */
export function countHits(groups: SearchGroup[]): number {
  return groups.reduce((sum, group) => sum + group.hits.length, 0);
}

export interface HighlightSegment {
  text: string;
  hit: boolean;
}

/**
 * 把一段文本按命中词切成 `{text, hit}` 片段。
 *
 * ⚠️ 返回的是**数据**，不是 HTML 字符串。渲染层必须用文本节点 + `<mark>`
 * 拼装，**全站禁止**把查询串交给 `dangerouslySetInnerHTML`（S1）。
 * 查询串来自 URL，是全站唯一的用户输入回显点，而 CSP 选了 `'unsafe-inline'`。
 */
export function splitHighlight(text: string, tokens: readonly string[]): HighlightSegment[] {
  if (!text) return [];
  const usable = tokens.filter((t) => t.length > 0).sort((a, b) => b.length - a.length);
  if (usable.length === 0) return [{ text, hit: false }];

  const lower = normalize(text);
  // normalize 可能改变长度（NFKC / 空白折叠），长度不一致时退回不高亮，
  // 宁可少一个视觉提示，也不要切错位置把字截断。
  if (lower.length !== text.length) return [{ text, hit: false }];

  const flags = new Array<boolean>(text.length).fill(false);
  for (const token of usable) {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(token, from);
      if (at === -1) break;
      for (let i = at; i < at + token.length; i += 1) flags[i] = true;
      from = at + 1;
    }
  }

  const segments: HighlightSegment[] = [];
  let start = 0;
  for (let i = 1; i <= text.length; i += 1) {
    if (i === text.length || flags[i] !== flags[start]) {
      segments.push({ text: text.slice(start, i), hit: Boolean(flags[start]) });
      start = i;
    }
  }
  return segments;
}
