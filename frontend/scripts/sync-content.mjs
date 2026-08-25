#!/usr/bin/env node
/**
 * 生成降级快照（spec §4.2 路径 A / §11.2.1 快照生命周期）。
 *
 *   node scripts/sync-content.mjs --api http://localhost:8000 --out src/content/snapshot
 *   node scripts/sync-content.mjs --api http://localhost:8000 --out src/content/snapshot --check
 *
 * v3 增量：检索索引落盘**两份**（spec §4.2.2 / 决策 A-2）——
 *   src/content/snapshot/search-index.json   供 /search 页静态 import（SSR）
 *   public/search-index.json                 供浏览器 fetch（⌘K 面板）
 * `public/` 下的文件无法被 import，`src/` 下的文件无法被浏览器直接 fetch。
 * 用 `fs.readFile(process.cwd() + '/public/...')` 可以省掉一份，但
 * `output: 'standalone'` 下 `process.cwd()` 指向 standalone 根目录，
 * `public/` 是否被复制取决于 Dockerfile 的 COPY 步骤 —— 那是把一个**构建
 * 产物完整性问题**换成了**运行时路径问题**，v2 B-8 已经付过一次代价。
 * 两份文件多占约 200 KB 磁盘，换来「缺失即构建期报错」，值得。
 * 两份内容**逐字节相同**，由本脚本的 `--check` 保证。
 *
 * 生命周期约定：
 *   - **生成时机**：CI 中，在 `npm run build` 之前。启动 api 容器 → 等
 *     `/health/ready` → 跑本脚本。
 *   - **是否入库**：入库。快照必须随代码走，否则离线构建（私有化交付的核心
 *     场景）拿不到它。
 *   - **漂移检查**：`--check` 重新生成后与仓库中的文件做 diff，不一致即失败，
 *     提示「内容包改了但没重新生成快照」。
 *   - **版本标记**：每个快照文件顶层带 `_contentHash` 与 `_generatedAt`，
 *     `api.ts` 走降级路径时把它们打进日志。
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = parseArgs(process.argv.slice(2));
const apiBase = args.api ?? 'http://localhost:8000';
const outDir = args.out ?? 'src/content/snapshot';
const publicOutDir = args['public-out'] ?? 'public';
const checkOnly = Boolean(args.check);

/** 检索索引的两个落点。两份内容逐字节相同。 */
const SEARCH_INDEX_KEY = 'search-index';
const SEARCH_INDEX_PATH = '/api/v1/search/index';

/** 快照键 → API 路径。与 src/content/snapshot/index.ts 的 registry 一一对应。 */
const TARGETS = [
  ['site-settings', '/api/v1/site/settings'],
  ['site-navigation', '/api/v1/site/navigation'],
  ['site-routes', '/api/v1/site/routes'],
  ['media-manifest', '/api/v1/media/manifest'],
  ['home', '/api/v1/home'],
  ['products', '/api/v1/products'],
  ['products-deployment', '/api/v1/products/deployment'],
  ['product-aragonteam', '/api/v1/products/aragonteam'],
  ['product-inkclaw', '/api/v1/products/inkclaw'],
  ['product-legallens', '/api/v1/products/legallens'],
  ['solutions', '/api/v1/solutions'],
  ['solution-telecom', '/api/v1/solutions/telecom'],
  ['solution-transportation', '/api/v1/solutions/transportation'],
  ['solution-legal-services', '/api/v1/solutions/legal-services'],
  ['solution-finance', '/api/v1/solutions/finance'],
  ['research-pillars', '/api/v1/research/pillars'],
  ['research-papers', '/api/v1/research/papers'],
  ['about', '/api/v1/about'],
  ['about-team', '/api/v1/about/team'],
  ['about-careers', '/api/v1/about/careers'],
  ['insights', '/api/v1/insights?page=1&pageSize=24'],
  [SEARCH_INDEX_KEY, SEARCH_INDEX_PATH],
];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function log(message) {
  process.stdout.write(`[snapshot] ${message}\n`);
}

async function getJson(pathname) {
  const res = await fetch(`${apiBase}${pathname}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} → ${pathname}`);
  return res.json();
}

/**
 * 去掉时间戳后比较，避免每次生成都因时间变化而误报漂移。
 *
 * 两个键都要去：
 *   `_generatedAt`  本脚本写入的快照生成时刻
 *   `generatedAt`   检索索引 payload 自带的字段，取值是**API 进程启动时刻**
 *                   （lifespan 里 build 一次）。它不是内容信号，留着会让
 *                   `--check` 每次重启 API 都报漂移 —— 一条永远红的门禁
 *                   等于没有门禁。
 */
function stableJson(payload) {
  // 用 delete 而不是解构丢弃：解构会留下两个「赋值了但没用」的绑定，
  // `eslint .`（比 `next lint` 的默认范围多扫 scripts/）会报 no-unused-vars。
  // 展开 + delete 不改变其余键的插入顺序，序列化结果与解构版逐字相同。
  const rest = { ...payload };
  delete rest._generatedAt;
  delete rest.generatedAt;
  return JSON.stringify(rest, null, 2);
}

async function main() {
  const health = await getJson('/api/v1/health');
  const contentHash = health.contentHash;
  if (!contentHash) throw new Error('API 未返回 contentHash，内容包可能未加载');
  log(`API ${apiBase} · contentHash=${contentHash}`);

  await mkdir(outDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const drifted = [];

  for (const [key, pathname] of TARGETS) {
    const data = await getJson(pathname);
    const payload = { _contentHash: contentHash, _generatedAt: generatedAt, ...data };
    const file = path.join(outDir, `${key}.json`);

    // 检索索引额外写一份到 public/，两份逐字节相同
    const mirror =
      key === SEARCH_INDEX_KEY ? path.join(publicOutDir, `${SEARCH_INDEX_KEY}.json`) : null;

    if (checkOnly) {
      if (!existsSync(file)) {
        drifted.push(`${key}（仓库中缺失）`);
        continue;
      }
      const current = JSON.parse(await readFile(file, 'utf8'));
      if (stableJson(current) !== stableJson(payload)) drifted.push(key);

      if (mirror) {
        if (!existsSync(mirror)) {
          drifted.push(`${key}（public 副本缺失）`);
        } else if ((await readFile(mirror, 'utf8')) !== (await readFile(file, 'utf8'))) {
          drifted.push(`${key}（两份索引不一致：${file} vs ${mirror}）`);
        }
      }
      continue;
    }

    const serialised = `${JSON.stringify(payload, null, 2)}\n`;
    await writeFile(file, serialised, 'utf8');
    if (mirror) {
      await mkdir(publicOutDir, { recursive: true });
      await writeFile(mirror, serialised, 'utf8');
      log(`索引副本 → ${mirror}`);
    }
  }

  // 洞察详情：正文也要进快照，否则 API 挂掉时详情页拿不到 bodyHtml
  const list = await getJson('/api/v1/insights?page=1&pageSize=24');
  const details = [];
  for (const item of list.items) {
    details.push(await getJson(`/api/v1/insights/${item.slug}`));
  }
  const detailPayload = { _contentHash: contentHash, _generatedAt: generatedAt, items: details };
  const detailFile = path.join(outDir, 'insights-detail.json');

  if (checkOnly) {
    if (!existsSync(detailFile)) {
      drifted.push('insights-detail（仓库中缺失）');
    } else {
      const current = JSON.parse(await readFile(detailFile, 'utf8'));
      if (stableJson(current) !== stableJson(detailPayload)) drifted.push('insights-detail');
    }
    if (drifted.length > 0) {
      log(`FAIL: ${drifted.length} 个快照与内容包不一致：${drifted.join(', ')}`);
      log('内容包改了但没重新生成快照，请运行：npm run content:snapshot');
      process.exitCode = 1;
      return;
    }
    log(`OK: ${TARGETS.length + 1} 个快照与内容包一致`);
    return;
  }

  await writeFile(detailFile, `${JSON.stringify(detailPayload, null, 2)}\n`, 'utf8');
  log(`完成：${TARGETS.length + 1} 个快照 → ${outDir}（含 ${details.length} 篇洞察正文）`);
}

main().catch((error) => {
  log(`FATAL: ${error.message}`);
  log('提示：请先启动 API（python -m uvicorn app.main:app --port 8000，工作目录 backend/）');
  process.exitCode = 1;
});
