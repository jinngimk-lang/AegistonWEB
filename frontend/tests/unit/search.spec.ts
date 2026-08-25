// @vitest-environment node
/**
 * 检索算法（v3 spec §10.2）。
 *
 * 这一组用例守的是三件事：
 *   1. **排序完全确定** —— 少一级 tie-break，同分项的顺序就依赖 Map 的插入
 *      顺序，E2E 会随机变红；
 *   2. **按键路径上不再分词** —— P0-3 指出的那个洞，实现方式是
 *      `buildRuntimeIndex()` 一次性建倒排表；
 *   3. **索引体积不失控** —— R2，触顶时调低 `body` 截断长度，不要抬预算。
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

import { describe, expect, it } from 'vitest';

import {
  GROUP_ORDER,
  buildRuntimeIndex,
  countHits,
  search,
  splitHighlight,
  tokenize,
  type SearchDoc,
  type SearchIndex,
} from '@/lib/search';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
const SNAPSHOT_FILE = path.join(ROOT, 'src', 'content', 'snapshot', 'search-index.json');
const PUBLIC_FILE = path.join(ROOT, 'public', 'search-index.json');

const rawSnapshot = readFileSync(SNAPSHOT_FILE);
const index = JSON.parse(rawSnapshot.toString('utf8')) as SearchIndex;
const runtime = buildRuntimeIndex(index);

describe('tokenize', () => {
  it('中英混排：拉丁整词 + CJK bigram + 短片段整段', () => {
    const tokens = tokenize('LegalLens 合约智审');
    expect(tokens).toContain('legallens');
    expect(tokens).toContain('合约');
    expect(tokens).toContain('约智');
    expect(tokens).toContain('智审');
    // 长度 ≤ 6 的 CJK 片段额外保留整段 —— 「合约智审」这类自造词词典切不准
    expect(tokens).toContain('合约智审');
  });

  it('长度 1 的拉丁词被丢弃，避免噪声召回全站', () => {
    expect(tokenize('a b c')).toEqual([]);
    expect(tokenize('ai')).toEqual(['ai']);
  });

  it('单个 CJK 字保留', () => {
    expect(tokenize('审')).toEqual(['审']);
  });

  it('归一化：全角标点、大小写、连续空白', () => {
    expect(tokenize('InkClaw，智能体')).toEqual(tokenize('inkclaw 智能体'));
  });

  it('去重：同一个 token 只出现一次', () => {
    const tokens = tokenize('合约 合约 合约');
    expect(tokens.filter((t) => t === '合约')).toHaveLength(1);
  });
});

describe('buildRuntimeIndex', () => {
  it('幂等：同一份索引构建两次，postings 完全相同', () => {
    const a = buildRuntimeIndex(index);
    const b = buildRuntimeIndex(index);
    expect([...a.postings.keys()].sort()).toEqual([...b.postings.keys()].sort());
    for (const key of a.postings.keys()) {
      expect(a.postings.get(key)).toEqual(b.postings.get(key));
    }
  });

  it('倒排表非空且携带 contentHash', () => {
    expect(runtime.postings.size).toBeGreaterThan(1000);
    expect(runtime.contentHash).toBe(index.contentHash);
    expect(runtime.titles).toHaveLength(index.docs.length);
  });
});

describe('search', () => {
  it('空查询返回空数组（不是抛错，也不是全量）', () => {
    expect(search(runtime, '')).toEqual([]);
    expect(search(runtime, '   ')).toEqual([]);
    // 只有 1 个拉丁字符 → 分词后为空
    expect(search(runtime, 'x')).toEqual([]);
  });

  it('排序完全确定：连续 20 次调用 id 序列一致', () => {
    const first = idsOf(search(runtime, '合约'));
    expect(first.length).toBeGreaterThan(0);
    for (let i = 0; i < 20; i += 1) {
      expect(idsOf(search(runtime, '合约'))).toEqual(first);
    }
  });

  it('标题精确命中优先：查 InkClaw 时 product:inkclaw 排第一', () => {
    const groups = search(runtime, 'InkClaw');
    expect(groups[0]?.hits[0]?.doc.id).toBe('product:inkclaw');
  });

  it('分组顺序固定、组内 ≤ 8、总计 ≤ 20', () => {
    const groups = search(runtime, '智能');
    const types = groups.map((g) => g.type);
    expect(types).toEqual(GROUP_ORDER.filter((t) => types.includes(t)));
    for (const group of groups) expect(group.hits.length).toBeLessThanOrEqual(8);
    expect(countHits(groups)).toBeLessThanOrEqual(20);
  });

  it('type 过滤只返回该类型', () => {
    const groups = search(runtime, '智能', { type: 'product' });
    expect(groups.every((g) => g.type === 'product')).toBe(true);
  });

  it('matchedTokens 是查询串的子集，且已排序', () => {
    const groups = search(runtime, '私有化部署');
    for (const group of groups) {
      for (const hit of group.hits) {
        expect(hit.matchedTokens).toEqual([...hit.matchedTokens].sort());
        for (const token of hit.matchedTokens) {
          expect(tokenize('私有化部署')).toContain(token);
        }
      }
    }
  });

  /**
   * **按键路径上不再读文档正文**（P0-3 / R16）。
   *
   * 用 spy 计 `tokenize` 调用次数是测不到的 —— `search()` 调的是模块内的本地
   * 绑定，spy 拦不住。这里换一种更强的证法：**把文档正文清空之后再检索**。
   * 如果打分路径上还有任何一处现场读 `doc.body` / `doc.excerpt` 重新分词，
   * 结果必然改变；结果不变，就证明分词已经全部前置到 `buildRuntimeIndex()`。
   */
  it('打分只读倒排表：清空文档正文后结果不变', () => {
    const before = idsOf(search(runtime, '合约智审'));
    const blanked = buildRuntimeIndex(index);
    blanked.docs = blanked.docs.map((doc) => ({
      ...doc,
      subtitle: '',
      excerpt: '',
      keywords: [],
      body: '',
    }));
    expect(idsOf(search(blanked, '合约智审'))).toEqual(before);
  });

  it('词频饱和：同一个词重复再多也压不过标题精确命中', () => {
    const spammy: SearchDoc = {
      id: 'page:spam',
      type: 'page',
      title: '无关页面',
      href: '/sitemap',
      excerpt: '',
      keywords: [],
      body: '合约 '.repeat(200),
      sourceSlides: [],
    };
    const custom = buildRuntimeIndex({
      ...index,
      docs: [...index.docs.filter((d) => d.id === 'product:legallens'), spammy],
    });
    expect(idsOf(search(custom, '合约'))[0]).toBe('product:legallens');
  });
});

describe('splitHighlight', () => {
  it('返回的是数据而不是 HTML 字符串', () => {
    const segments = splitHighlight('合约智审平台', ['合约']);
    expect(segments.map((s) => s.text).join('')).toBe('合约智审平台');
    expect(segments.some((s) => s.hit)).toBe(true);
    for (const segment of segments) expect(typeof segment.text).toBe('string');
  });

  it('恶意载荷只是普通文本，不产生任何标记', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const segments = splitHighlight(`前缀 ${payload} 后缀`, ['img']);
    const joined = segments.map((s) => s.text).join('');
    expect(joined).toBe(`前缀 ${payload} 后缀`);
  });

  it('没有命中词时整段返回，不做切分', () => {
    expect(splitHighlight('一段文本', [])).toEqual([{ text: '一段文本', hit: false }]);
  });
});

describe('索引产物', () => {
  it('两份索引逐字节相同（src 供 import、public 供 fetch）', () => {
    expect(readFileSync(PUBLIC_FILE).equals(rawSnapshot)).toBe(true);
  });

  it('体积在预算内：raw ≤ 200 KB 且 gzip ≤ 60 KB', () => {
    // 触顶时**调低 `body` 截断长度**（backend/app/services/search.py 的
    // BODY_LIMIT），不要直接抬预算 —— R2 / P2-5。
    expect(rawSnapshot.length).toBeLessThanOrEqual(200 * 1024);
    expect(zlib.gzipSync(rawSnapshot, { level: 9 }).length).toBeLessThanOrEqual(60 * 1024);
  });

  it('每条 body ≤ 1600 字符、excerpt ≤ 160 字符', () => {
    for (const doc of index.docs) {
      expect(doc.body.length).toBeLessThanOrEqual(1600);
      expect(doc.excerpt.length).toBeLessThanOrEqual(160);
    }
  });

  it('文档 id 唯一，href 全部以 / 开头', () => {
    const ids = index.docs.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const doc of index.docs) expect(doc.href.startsWith('/')).toBe(true);
  });

  it('索引里没有 score 字段 —— 后端不打分（§4.2.1 / R1）', () => {
    for (const doc of index.docs) {
      expect(doc).not.toHaveProperty('score');
    }
  });
});

function idsOf(groups: ReturnType<typeof search>): string[] {
  return groups.flatMap((group) => group.hits.map((hit) => hit.doc.id));
}
