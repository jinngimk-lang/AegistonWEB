// @vitest-environment node
/**
 * nginx 配置文本断言（v3 spec §4.8.1 / P1-8 / P0-4 / P2-9）。
 *
 * **为什么读文本而不是发请求**：E2E 直连 `next start`，CI 流水线里根本没有
 * nginx —— 访问 `/metrics` 拿到的是 Next 的 **404**，不是 nginx 的 403。
 * 把「没有 nginx 的环境里断言 nginx 行为」写成 E2E，是这类方案最常见的一种
 * **假门禁**：它永远绿，而且绿得毫无意义。
 *
 * 这里用的是与 `styles.spec.ts` 同一套做法：解析配置文本，断言关键规则逐条
 * 存在。它守不住「配置写对了但没部署」，那一层由 `docs/ops/runbook.md` 的
 * 上线核对项承担 —— 两层各守各的，别混为一谈。
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const NGINX_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../nginx');
const common = readFileSync(path.join(NGINX_DIR, 'aegiston-common.inc'), 'utf8');
const server = readFileSync(path.join(NGINX_DIR, 'aegiston.conf'), 'utf8');

/** 去掉注释行，避免「注释里写了」被当成「配置里有」。 */
function code(text: string): string {
  return text
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');
}

const commonCode = code(common);
const serverCode = code(server);

describe('nginx · /metrics 不对公网开放', () => {
  it('存在 `location = /metrics { deny all; }`', () => {
    expect(commonCode).toMatch(/location\s*=\s*\/metrics\s*\{[^}]*deny\s+all;/);
  });
});

describe('nginx · 限流必须返回 429 而不是默认的 503', () => {
  it('http 层定义了 limit_req_zone', () => {
    expect(serverCode).toMatch(/limit_req_zone\s+\$binary_remote_addr\s+zone=api:/);
  });

  it('/api/ 上挂了 limit_req', () => {
    expect(commonCode).toMatch(/limit_req\s+zone=api\s+burst=\d+\s+nodelay;/);
  });

  it('显式设了 limit_req_status 429', () => {
    // nginx 默认返回 503。CLAUDE.md §8 要求 429 必须给出一条真能走通的兜底
    // 联系路径 —— 一个裸的 503 错误页把用户送进了死路。
    expect(commonCode).toMatch(/limit_req_status\s+429;/);
  });

  /**
   * ⚠️ 断言的是「**给得出**一条真能走通的兜底路径」，不是「字段名都在」。
   *
   * 内容包 `site.json` 的 `contact.phone` 是 null（v2 §15 待确认项），所以
   * 429 兜底页里没有电话。要求 `"phone"` 字段存在，只会逼出一个 `"phone":""`
   * ——门禁绿了，用户拿到的仍是死路，这正是本仓库最忌讳的假门禁。
   * 因此改为：必须有非空的联系方式，且**不允许出现任何空值的联系字段**。
   * 与 v2 `LeadForm.tsx` 同一口径：邮箱恒给，电话有才给。
   */
  it('429 有 JSON 兜底页，且给出了非空的联系方式', () => {
    expect(commonCode).toMatch(/error_page\s+429\s+\/429\.json;/);
    const fallback = /location\s*=\s*\/429\.json\s*\{[\s\S]*?\}/.exec(commonCode)?.[0] ?? '';
    expect(fallback).toContain('internal;');
    expect(fallback).toContain('application/json');
    expect(fallback).toMatch(/"email"\s*:\s*"[^"]+@[^"]+"/);
    // 空的联系方式比没有更糟：它让门禁变绿，却把用户送进死路
    expect(fallback).not.toMatch(/"(email|phone)"\s*:\s*(""|null)/);
  });
});

describe('nginx · 检索索引不能被 immutable 缓存住', () => {
  it('immutable 的 location 只覆盖 media / fonts / brand', () => {
    const immutableLocations = [...commonCode.matchAll(/location\s+([^{]+)\{([\s\S]*?)\n\}/g)]
      .filter(([, , body]) => /immutable/.test(body ?? ''))
      .map(([, head]) => (head ?? '').trim());
    expect(immutableLocations.length).toBeGreaterThan(0);
    for (const head of immutableLocations) {
      expect(head).not.toMatch(/search-index/);
    }
  });

  it('search-index.json 不出现在任何 immutable 规则里', () => {
    // URL 上带 `?v=<contentHash>` 才让 force-cache 安全；再叠一层 immutable
    // 会让**没带版本位的旧请求**长期命中陈旧索引 → 结果里出现死链（P0-4 / R17）
    const immutableBlocks = commonCode
      .split('location')
      .filter((block) => block.includes('immutable'));
    for (const block of immutableBlocks) {
      expect(block).not.toContain('search-index');
    }
  });
});

describe('nginx · add_header 不继承，新增 location 必须重申安全头', () => {
  const REQUIRED = ['Content-Security-Policy', 'X-Content-Type-Options'];

  it('每个设置了 Cache-Control 的 location 都重新声明了安全头', () => {
    // nginx 的 `add_header` **不继承**：子 location 一旦自己写了 add_header，
    // 父层级的全部 add_header 就被丢弃。只写 Cache-Control 会把该 location 的
    // CSP 一起丢掉，而这种事只有上线后才被发现（P2-9）。
    const blocks = [...commonCode.matchAll(/location\s+[^{]+\{([\s\S]*?)\n\}/g)].map(
      ([, body]) => body ?? '',
    );
    const withCacheControl = blocks.filter((body) => /add_header\s+Cache-Control/.test(body));
    expect(withCacheControl.length).toBeGreaterThan(0);
    for (const body of withCacheControl) {
      for (const header of REQUIRED) {
        expect(body).toContain(header);
      }
    }
  });
});

describe('nginx · CSP 论证文字必须与 /search 的存在同步', () => {
  it('抬头注释里不再写「没有用户输入回显」', () => {
    // `/search?q=…` 把这句话变成了假的。留着一句已经不成立的安全论证，
    // 比没有论证更危险（v3 §4.2.7）。
    expect(server).not.toContain('本站没有用户输入回显');
  });

  it('抬头注释里点名了 /search 是唯一回显点且只经文本节点渲染', () => {
    expect(server).toContain('/search');
    expect(server).toContain('文本节点');
  });
});
