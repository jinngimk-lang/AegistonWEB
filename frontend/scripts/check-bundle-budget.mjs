#!/usr/bin/env node
/**
 * 打包体积门禁（v3 spec §4.6.2 / 决策 A-13）。需要先跑一次 `next build`。
 *
 *   node scripts/check-bundle-budget.mjs
 *   node scripts/check-bundle-budget.mjs --json      # 机器可读，供 CI 摘要用
 *
 * ⚠️ **口径**：本脚本的 gzip 与 `next build` 终端输出的 "First Load JS" 都是
 * gzip 之后的数字。证据：`next/dist/build/utils.js` 里
 * `computeFromManifest(manifests, distPath, gzipSize = true)` +
 * `const getSize = gzipSize ? fsStatGzip : fsStat`。
 *
 * 但本脚本的数字会**系统性地比终端输出高约 5 kB**，这不是误差，是口径差异，
 * 实测核对过：`next build` 报的 `/` = 112 kB，本脚本报 117.5 kB。差额来自
 * `static/chunks/app/layout-*.js`（实测 8.3 kB gzip）—— Next 的表格把
 * layout 专属 chunk 排除在页面的 "First Load JS" 之外，而它在浏览器里
 * **确确实实要在首次渲染前下载**。本脚本按 `union(祖先 layout, page)` 计量，
 * 是更诚实的口径，代价是与终端表格对不齐。
 * **一切以本脚本的输出为准**，不要拿终端输出跟预算文件对着吵。
 *
 * ⚠️ **js 与 css 必须分开计量**：`app-build-manifest.json` 每条 route 的文件
 * 列表里 `.css` 与 `.js` 是混排的。不分开就会把字体声明表算进「First Load
 * **JS**」，得到一个与预算毫无对应关系的数字（v3 P0-1）。
 *
 * 判定规则：**gzip 是硬门禁，raw 只打印不拦**。raw 留着是为了排查
 * （「这次是多了一个大依赖，还是同一个依赖变大了」raw 比 gzip 说明问题）。
 */

import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, '.next');
const BUDGET_FILE = path.join(ROOT, 'bundle-budget.json');
const asJson = process.argv.includes('--json');

function log(message) {
  process.stdout.write(`[budget] ${message}\n`);
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

async function sizes(files) {
  let raw = 0;
  let gz = 0;
  for (const file of files) {
    const abs = path.join(NEXT_DIR, file);
    if (!existsSync(abs)) continue;
    const stats = await stat(abs);
    raw += stats.size;
    gz += zlib.gzipSync(await readFile(abs), { level: 9 }).length;
  }
  return { raw, gz };
}

/**
 * 把 `app-build-manifest.json` 的**条目**折算成**路由**。
 *
 * ⚠️ App Router 里一条路由的 First Load JS = 它自己的 `/…/page` 条目 **并上
 * 全部祖先 `layout` 条目**（去重后）。清单里 `/layout` 与 `/page` 是两条独立
 * 记录；照条目逐条判定会同时低估两边 —— 全局样式挂在 `/layout` 上，
 * 而门槛写在 `/page` 上就成了一条永远绿的假门禁。
 *
 * 校验方式：折算后的数字应与 `next build` 终端表里的 "First Load JS" 对得上
 * （个位数 kB 的差异来自 shared chunk 去重逻辑与 gzip level）。
 */
function entryFiles(pages) {
  const out = {};
  for (const [key, files] of Object.entries(pages)) {
    // 只有 `/…/page` 与 `/…/route` 是真实路由；layout / error / loading 是它们的组成部分
    if (!key.endsWith('/page') && !key.endsWith('/route')) continue;
    const segments = key.split('/').slice(1, -1); // 去掉开头空串与结尾 page/route
    const merged = [];
    for (let depth = 0; depth <= segments.length; depth += 1) {
      const layoutKey = `/${segments.slice(0, depth).concat('layout').join('/')}`;
      if (pages[layoutKey]) merged.push(...pages[layoutKey]);
    }
    merged.push(...files);
    out[key] = merged;
  }
  return out;
}

async function main() {
  const manifestPath = path.join(NEXT_DIR, 'app-build-manifest.json');
  if (!existsSync(manifestPath)) {
    log('FAIL 找不到 .next/app-build-manifest.json —— 请先运行 npm run build');
    process.exitCode = 1;
    return;
  }

  const budget = JSON.parse(await readFile(BUDGET_FILE, 'utf8'));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  const rows = [];
  const failures = [];
  let biggestJsChunk = { file: '', raw: 0 };

  for (const [route, files] of Object.entries(entryFiles(manifest.pages))) {
    const unique = Array.from(new Set(files));
    const js = await sizes(unique.filter((f) => f.endsWith('.js')));
    const css = await sizes(unique.filter((f) => f.endsWith('.css')));
    rows.push({ route, js, css });

    const limits = budget.routes[route] ?? budget.routes.default;
    if (limits?.jsGzipKb && js.gz > limits.jsGzipKb * 1024) {
      failures.push(
        `${route}: JS gzip ${kb(js.gz)} > 门槛 ${limits.jsGzipKb} kB`,
      );
    }
    if (limits?.cssGzipKb && css.gz > limits.cssGzipKb * 1024) {
      failures.push(
        `${route}: 渲染阻塞 CSS gzip ${kb(css.gz)} > 门槛 ${limits.cssGzipKb} kB`,
      );
    }
  }

  // 单个 JS chunk 的上限：拦住**新引入**的巨型依赖。
  // framework chunk 由 Next 提供，本项目改不动，所以门槛按实测设。
  for (const files of Object.values(manifest.pages)) {
    for (const file of new Set(files)) {
      if (!file.endsWith('.js')) continue;
      const abs = path.join(NEXT_DIR, file);
      if (!existsSync(abs)) continue;
      const { size } = await stat(abs);
      if (size > biggestJsChunk.raw) biggestJsChunk = { file, raw: size };
    }
  }
  if (biggestJsChunk.raw > budget.maxSingleJsChunkRawKb * 1024) {
    failures.push(
      `单个 JS chunk ${biggestJsChunk.file} raw ${kb(biggestJsChunk.raw)} > 门槛 ${budget.maxSingleJsChunkRawKb} kB`,
    );
  }

  rows.sort((a, b) => b.js.gz - a.js.gz);

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ rows, failures, biggestJsChunk }, null, 2)}\n`);
  } else {
    // 无论成败都打印四列表，便于在 PR 里直接看
    log('route                                   js gzip     css gzip    js raw      css raw');
    log('-'.repeat(88));
    for (const row of rows) {
      log(
        `${row.route.padEnd(38)}  ${kb(row.js.gz).padEnd(10)}  ${kb(row.css.gz).padEnd(10)}  ` +
          `${kb(row.js.raw).padEnd(10)}  ${kb(row.css.raw)}`,
      );
    }
    log('-'.repeat(88));
    log(`最大单个 JS chunk：${biggestJsChunk.file} · raw ${kb(biggestJsChunk.raw)}`);
    log('口径：gzip 为硬门禁（与 next build 的 "First Load JS" 同口径）；raw 只打印不判定。');
  }

  if (failures.length > 0) {
    log(`FAIL ${failures.length} 条预算被突破：`);
    for (const item of failures) log(`  - ${item}`);
    process.exitCode = 1;
    return;
  }
  log(`PASS ${rows.length} 条路由全部在预算内`);
}

main().catch((error) => {
  log(`FATAL ${error.message}`);
  process.exitCode = 1;
});
