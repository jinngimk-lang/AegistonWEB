#!/usr/bin/env node
/**
 * 字体声明表拆分 + 首屏分片 preload 计算（v3 spec §4.6.1 M5-a / §4.6.4）。
 *
 *   node scripts/pick-preload-fonts.mjs
 *   node scripts/pick-preload-fonts.mjs --check
 *
 * 为什么要拆：`src/styles/fonts.css` 有 **534 条 @font-face / 209 个分片**
 * （源文件 562 kB，构建产物实测 487.9 kB raw / 153.4 kB gzip）。它由
 * `layout.tsx` 直接 import，因而**在渲染阻塞路径上，位置在 LCP 之前**，
 * 比全站 JS 加起来还大。在它还挂着的时候谈论省 2 kB JS 是没有意义的。
 *
 * 拆法：按**首屏实际会渲染的字符**把 @font-face 分成两半 ——
 *
 *   src/styles/fonts-critical.css    覆盖首屏字符的分片，随 globals.css 走关键路径
 *   public/styles/fonts-rest.css     其余全部，由 `DeferredFontStyles` 在挂载后异步挂上
 *   src/styles/font-preload.json     首屏最该 preload 的 ≤ 4 个分片
 *
 * ⚠️ 产物落点与 spec §7.2 的字面写法有一处偏差（已回写到「实施过程发现的
 * 方案缺陷」B 组）：`fonts-rest.css` **必须**在 `public/` 下，因为
 * `<link rel="stylesheet" href>` 只能指向 Next 真正会 serve 的 URL，
 * 而 `src/styles/*.css` 只能被 import。放 `public/styles/` 而不是
 * `public/fonts/`，是为了避开 nginx 里 `^/(media|fonts|brand)/` 那条
 * `immutable` 规则 —— 文件名固定的样式表配 immutable 会拿到陈旧内容。
 *
 * ⚠️ preload **硬上限 4 片**：preload 过多会与首屏图片抢带宽，反而拖慢 LCP。
 * 超过上限脚本直接失败，要求人工确认。
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'src', 'styles', 'fonts.css');
const CRITICAL_OUT = path.join(ROOT, 'src', 'styles', 'fonts-critical.css');
const REST_OUT = path.join(ROOT, 'public', 'styles', 'fonts-rest.css');
const PRELOAD_OUT = path.join(ROOT, 'src', 'styles', 'font-preload.json');
const SNAPSHOT_DIR = path.join(ROOT, 'src', 'content', 'snapshot');

const PRELOAD_MAX = 4;
const checkOnly = process.argv.includes('--check');

function log(message) {
  process.stdout.write(`[fonts-split] ${message}\n`);
}

/** 首屏一定会出现的字符：品牌名 + hero 标题/副标题/CTA + 顶栏与导航标签。 */
async function firstScreenText() {
  const read = async (file) => JSON.parse(await readFile(path.join(SNAPSHOT_DIR, file), 'utf8'));
  const settings = await read('site-settings.json');
  const nav = await read('site-navigation.json');
  const home = await read('home.json');

  const parts = [
    settings.nameCn,
    settings.nameEn,
    settings.tagline,
    home.hero.eyebrow,
    home.hero.titleLead,
    home.hero.titlePrefix,
    home.hero.titleEm,
    home.hero.subtitle,
    home.hero.primary?.label,
    home.hero.secondary?.label,
    nav.cta?.label,
    ...(nav.main ?? []).map((group) => group.label),
    ...(nav.utilityLeft ?? []).map((item) => item.label),
    ...(nav.utilityRight ?? []).map((item) => item.label),
    // 键盘提示徽标与 Esc 之类的固定 UI 文案
    '⌘K Ctrl 搜索 站内检索 跳到主要内容 返回顶部',
  ];
  return parts.filter(Boolean).join(' ');
}

/** `U+4e00-9fff, U+ff01` → [[0x4e00, 0x9fff], [0xff01, 0xff01]] */
function parseUnicodeRange(value) {
  const out = [];
  for (const token of value.split(',')) {
    const raw = token.trim().replace(/^U\+/i, '');
    if (!raw) continue;
    if (raw.includes('-')) {
      const [from, to] = raw.split('-');
      out.push([parseInt(from, 16), parseInt(to, 16)]);
    } else if (raw.includes('?')) {
      out.push([parseInt(raw.replace(/\?/g, '0'), 16), parseInt(raw.replace(/\?/g, 'f'), 16)]);
    } else {
      const code = parseInt(raw, 16);
      out.push([code, code]);
    }
  }
  return out;
}

/** 把 fonts.css 切成 { header, blocks: [{ text, family, weight, url, ranges }] } */
function parseFontFaces(css) {
  const blocks = [];
  const re = /(\/\*[^*]*\*\/\s*)?@font-face\s*\{[^}]*\}/g;
  let match;
  while ((match = re.exec(css)) !== null) {
    const text = match[0];
    const family = /font-family:\s*'([^']+)'/.exec(text)?.[1] ?? '';
    const weight = /font-weight:\s*(\d+)/.exec(text)?.[1] ?? '400';
    const url = /url\(([^)]+)\)/.exec(text)?.[1] ?? '';
    const rangeRaw = /unicode-range:\s*([^;]+);/.exec(text)?.[1] ?? '';
    blocks.push({
      text,
      family,
      weight: Number(weight),
      url: url.trim(),
      ranges: rangeRaw ? parseUnicodeRange(rangeRaw) : null,
    });
  }
  return { blocks };
}

function covers(ranges, code) {
  if (!ranges) return true; // 没有 unicode-range 的块覆盖全部字符，必须进关键路径
  for (const [from, to] of ranges) {
    if (code >= from && code <= to) return true;
  }
  return false;
}

async function main() {
  if (!existsSync(SOURCE)) {
    log(`FAIL 找不到 ${SOURCE} —— 请先运行 npm run fonts:fetch`);
    process.exitCode = 1;
    return;
  }

  const css = await readFile(SOURCE, 'utf8');
  const { blocks } = parseFontFaces(css);
  const text = await firstScreenText();
  const codes = Array.from(new Set(Array.from(text).map((ch) => ch.codePointAt(0))));

  // 每个分片覆盖了多少个首屏字符 —— 既用来分组，也用来排 preload 优先级
  const scored = blocks.map((block) => {
    let hits = 0;
    for (const code of codes) if (covers(block.ranges, code)) hits += 1;
    return { block, hits };
  });

  const critical = scored.filter((item) => item.hits > 0).map((item) => item.block);
  const rest = scored.filter((item) => item.hits === 0).map((item) => item.block);

  const banner = (which) =>
    `/* ==========================================================================\n` +
    `   自托管字体 · ${which}（由 scripts/pick-preload-fonts.mjs 生成，勿手改）\n` +
    `   拆分依据：首屏实际渲染的字符集（品牌名 + hero + 导航标签）。\n` +
    `   为什么要拆：整表 534 条 @font-face 在渲染阻塞路径上，位置在 LCP 之前，\n` +
    `   比全站 JS 加起来还大（v3 spec §4.6.1 M5-a）。\n` +
    `   ========================================================================== */\n`;

  const criticalCss = `${banner('首屏关键分片')}\n${critical.map((b) => b.text).join('\n')}\n`;
  const restCss = `${banner('其余分片 · 异步挂载')}\n${rest.map((b) => b.text).join('\n')}\n`;

  // preload：按覆盖首屏字符数降序，正文字重（400/500/700）优先，硬上限 4
  const preloadPool = scored
    .filter((item) => item.hits > 0 && item.block.url)
    .sort((a, b) => b.hits - a.hits || a.block.weight - b.block.weight);
  const seen = new Set();
  const preload = [];
  for (const item of preloadPool) {
    const key = `${item.block.family}:${item.block.weight}`;
    if (seen.has(key)) continue;
    seen.add(key);
    preload.push(item.block.url);
    if (preload.length >= PRELOAD_MAX) break;
  }
  if (preload.length > PRELOAD_MAX) {
    log(`FAIL preload 分片 ${preload.length} 片超过硬上限 ${PRELOAD_MAX}`);
    process.exitCode = 1;
    return;
  }

  const preloadJson = `${JSON.stringify(
    {
      _note: '由 scripts/pick-preload-fonts.mjs 生成，勿手改。硬上限 4 片（§4.6.4）。',
      preload,
    },
    null,
    2,
  )}\n`;

  log(`@font-face 总数 ${blocks.length} → 关键 ${critical.length} · 其余 ${rest.length}`);
  log(
    `体积 ${(css.length / 1024).toFixed(1)} kB → 关键 ${(criticalCss.length / 1024).toFixed(1)} kB` +
      ` · 其余 ${(restCss.length / 1024).toFixed(1)} kB`,
  );
  log(`preload ${preload.length} 片`);

  if (checkOnly) {
    const drifted = [];
    for (const [file, expected] of [
      [CRITICAL_OUT, criticalCss],
      [REST_OUT, restCss],
      [PRELOAD_OUT, preloadJson],
    ]) {
      if (!existsSync(file)) drifted.push(`${path.relative(ROOT, file)}（缺失）`);
      else if ((await readFile(file, 'utf8')) !== expected) drifted.push(path.relative(ROOT, file));
    }
    if (drifted.length > 0) {
      log(`FAIL ${drifted.length} 个产物与 fonts.css 不一致：${drifted.join(', ')}`);
      log('提示：改了 fonts.css 或首屏文案后请重跑 npm run fonts:preload');
      process.exitCode = 1;
      return;
    }
    log('PASS 拆分产物与 fonts.css 一致');
    return;
  }

  await mkdir(path.dirname(REST_OUT), { recursive: true });
  await writeFile(CRITICAL_OUT, criticalCss, 'utf8');
  await writeFile(REST_OUT, restCss, 'utf8');
  await writeFile(PRELOAD_OUT, preloadJson, 'utf8');
  log(`完成 → ${path.relative(ROOT, CRITICAL_OUT)} · ${path.relative(ROOT, REST_OUT)} · ${path.relative(ROOT, PRELOAD_OUT)}`);
}

main().catch((error) => {
  log(`FATAL ${error.message}`);
  process.exitCode = 1;
});
