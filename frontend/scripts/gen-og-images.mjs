#!/usr/bin/env node
/**
 * Open Graph 分享图合成（v3 spec §4.5.1 / 决策 A-5）。
 *
 *   node scripts/gen-og-images.mjs --map og-map.json --out public/og
 *   node scripts/gen-og-images.mjs --map og-map.json --out public/og --check
 *
 * **图里不含任何文字。** 中文标题要排进 PNG 就需要一份完整的 CJK 字体，
 * 而 v2 已把字体按 unicode-range 切成 209 个分片，satori / resvg / sharp 都
 * 无法从分片里自动挑片；补一份完整的 Noto Sans SC（≈ 10 MB）入库只为生成
 * 几十张图，代价与收益不成比例；不入库则构建期必须联网下载，直接违反
 * CLAUDE.md §5。标题与描述由 `og:title` / `og:description` 文本承载，
 * 微信 / X / LinkedIn / 飞书都会把它们渲染在图旁，信息不丢失。
 *
 * 三层合成，全部由 sharp（已是 dependencies，v2 就在用）完成，零新增依赖：
 *   底层  该页面的代表性媒体，centre-crop 到 1200×630，模糊 σ=12，亮度 ×0.42
 *   中层  品牌渐变遮罩（--navy-deep → --red，0.55，135°）
 *   顶层  brand/logo.svg 的图形部分（左下）+ 右下一条 4px 品牌色标尺
 *
 * `--check` 必须做四件事，缺一条就退化成摆设（v3 P1-5）：
 *   1. 清单里每个 key 的文件存在、字节数与 sha256 一致      → 产物被误删 / 手改
 *   2. og-map 的 key 集合 == 清单的 key 集合                → 改了映射表没重跑
 *   3. 每个 sourceMediaId 存在，且其源文件 sha256 未变      → 底图被换 / 被重新打码
 *   4. 每张图尺寸恰好 1200×630（读 metadata，**不比对像素字节**）→ 见 R8
 * `--check` **不重新合成图片** —— 重新合成即触发 R8（跨平台字节不同）。
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import sharp from 'sharp';

const ROOT = process.cwd();
const REPO_ROOT = path.resolve(ROOT, '..');

const args = parseArgs(process.argv.slice(2));
const mapFile = path.join(ROOT, args.map ?? 'og-map.json');
const outDir = path.join(ROOT, args.out ?? path.join('public', 'og'));
const checkOnly = Boolean(args.check);

const WIDTH = 1200;
const HEIGHT = 630;
const MAX_BYTES = 180 * 1024;
const MAX_TOTAL_BYTES = 6 * 1024 * 1024;

/** 品牌色，与 src/styles/tokens.css 逐字一致。改这里必须同步改那里。 */
const NAVY_DEEP = '#001A3D';
const RED = '#2D638A';

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
  process.stdout.write(`[og] ${message}\n`);
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function loadMediaIndex() {
  const dir = path.join(REPO_ROOT, 'backend', 'app', 'content');
  const manifest = JSON.parse(await readFile(path.join(dir, 'media_manifest.json'), 'utf8'));
  const stock = JSON.parse(await readFile(path.join(dir, 'stock_credits.json'), 'utf8'));
  const index = new Map();
  for (const asset of manifest.assets) index.set(asset.id, asset.src);
  for (const asset of stock.assets) index.set(asset.id, asset.src);
  return index;
}

function overlaySvg() {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${NAVY_DEEP}" stop-opacity="0.86"/>
      <stop offset="100%" stop-color="${RED}" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#brand)"/>
  <g transform="translate(80 430) scale(4.2)" fill="none" stroke="#FFFFFF" stroke-width="1.8">
    <path d="M26 6 L44 14 L44 30 C44 39 36 45 26 47 C16 45 8 39 8 30 L8 14 Z"/>
    <path d="M17 26 L23 32 L35 20" stroke-linecap="square"/>
  </g>
  <rect x="${WIDTH - 260}" y="${HEIGHT - 84}" width="180" height="4" fill="#FFFFFF" opacity="0.9"/>
  <rect x="${WIDTH - 80}" y="${HEIGHT - 84}" width="40" height="4" fill="${RED}"/>
</svg>`,
  );
}

async function compose(sourcePath) {
  const base = await sharp(sourcePath)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
    .blur(12)
    .modulate({ brightness: 0.42 })
    .toBuffer();

  return sharp(base)
    .composite([{ input: overlaySvg(), top: 0, left: 0 }])
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();
}

/** 品牌图标（P2-4）：manifest.webmanifest 需要 192 / 512 的 PNG，brand/ 里只有 SVG。 */
async function generateIcons() {
  const svg = await readFile(path.join(ROOT, 'public', 'brand', 'favicon.svg'));
  for (const size of [192, 512]) {
    const buffer = await sharp(svg, { density: 384 })
      .resize(size, size, { fit: 'contain' })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await writeFile(path.join(ROOT, 'public', 'brand', `icon-${size}.png`), buffer);
    log(`icon-${size}.png · ${buffer.length} bytes`);
  }
}

async function main() {
  const map = JSON.parse(await readFile(mapFile, 'utf8'));
  const sources = map.sources ?? {};
  const mediaIndex = await loadMediaIndex();
  const manifestPath = path.join(outDir, 'manifest.json');

  if (checkOnly) {
    if (!existsSync(manifestPath)) {
      log('FAIL 清单缺失 —— 请先运行 npm run og:gen');
      process.exitCode = 1;
      return;
    }
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const problems = [];

    // 比对 2：映射表与清单的 key 集合必须相等。这条守的是「改了 og-map.json
    // 却没重跑 og:gen」—— 只比 sha256 的话清单与文件依然自洽，检查照样 PASS。
    const mapKeys = new Set(Object.keys(sources));
    const manifestKeys = new Set(Object.keys(manifest.images));
    for (const key of mapKeys) {
      if (!manifestKeys.has(key)) problems.push(`og-map 有 ${key}，清单里没有（改了映射表没重跑？）`);
    }
    for (const key of manifestKeys) {
      if (!mapKeys.has(key)) problems.push(`清单有 ${key}，og-map 里没有（映射表删了没重跑？）`);
    }

    let totalBytes = 0;
    for (const [key, entry] of Object.entries(manifest.images)) {
      const file = path.join(outDir, entry.file);
      if (!existsSync(file)) {
        problems.push(`${key}: 产物缺失 ${entry.file}`);
        continue;
      }
      const buffer = await readFile(file);
      totalBytes += buffer.length;
      // 比对 1
      if (buffer.length !== entry.bytes) problems.push(`${key}: 字节数 ${buffer.length} ≠ 清单 ${entry.bytes}`);
      if (sha256(buffer) !== entry.sha256) problems.push(`${key}: sha256 与清单不符（被手改？）`);
      if (buffer.length > MAX_BYTES) problems.push(`${key}: ${buffer.length} bytes 超过单张上限 ${MAX_BYTES}`);

      // 比对 4：只读尺寸，**不比对像素字节**（sharp 跨平台合成结果不同，R8）
      const meta = await sharp(buffer).metadata();
      if (meta.width !== WIDTH || meta.height !== HEIGHT) {
        problems.push(`${key}: 尺寸 ${meta.width}×${meta.height} ≠ ${WIDTH}×${HEIGHT}`);
      }

      // 比对 3：底图还是不是当初那张（被替换 / 被重新打码都会变 sha256）
      const src = mediaIndex.get(entry.sourceMediaId);
      if (!src) {
        problems.push(`${key}: sourceMediaId ${entry.sourceMediaId} 不在媒体清单里`);
        continue;
      }
      const srcFile = path.join(ROOT, 'public', src.replace(/^\//, ''));
      if (!existsSync(srcFile)) {
        problems.push(`${key}: 底图文件缺失 ${src}`);
        continue;
      }
      if (sha256(await readFile(srcFile)) !== entry.sourceSha256) {
        problems.push(`${key}: 底图 ${src} 已变化（被替换或重新打码），OG 图需要重生成`);
      }
    }

    if (totalBytes > MAX_TOTAL_BYTES) {
      problems.push(`OG 产物总量 ${(totalBytes / 1024 / 1024).toFixed(2)} MB 超过 ${MAX_TOTAL_BYTES / 1024 / 1024} MB`);
    }

    if (problems.length > 0) {
      log(`FAIL ${problems.length} 项不一致：`);
      for (const item of problems) log(`  - ${item}`);
      log('提示：请运行 npm --prefix frontend run og:gen');
      process.exitCode = 1;
      return;
    }
    log(`PASS ${manifestKeys.size} 张 OG 图与清单一致 · 合计 ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
    return;
  }

  await mkdir(outDir, { recursive: true });
  const images = {};
  let totalBytes = 0;

  for (const [key, mediaId] of Object.entries(sources)) {
    const src = mediaIndex.get(mediaId);
    if (!src) throw new Error(`og-map 的 ${key} 指向不存在的媒体 ${mediaId}`);
    const srcFile = path.join(ROOT, 'public', src.replace(/^\//, ''));
    if (!existsSync(srcFile)) throw new Error(`底图文件缺失：${src}`);

    const buffer = await compose(srcFile);
    if (buffer.length > MAX_BYTES) {
      throw new Error(`${key}: 合成结果 ${buffer.length} bytes 超过单张上限 ${MAX_BYTES}`);
    }
    const file = `${key}.png`;
    await writeFile(path.join(outDir, file), buffer);
    totalBytes += buffer.length;

    images[key] = {
      file,
      bytes: buffer.length,
      sha256: sha256(buffer),
      sourceMediaId: mediaId,
      sourceSha256: sha256(await readFile(srcFile)),
    };
    log(`${file} · ${buffer.length} bytes ← ${mediaId}`);
  }

  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new Error(`OG 产物总量 ${(totalBytes / 1024 / 1024).toFixed(2)} MB 超过预算`);
  }

  await generateIcons();

  // 清理不再被映射表引用的旧产物，避免仓库里堆孤儿图片
  for (const name of await readdir(outDir)) {
    if (name === 'manifest.json') continue;
    if (!Object.values(images).some((entry) => entry.file === name)) {
      log(`WARN 孤儿产物（映射表已不再引用，请手工确认后删除）：${name}`);
    }
  }

  await writeFile(
    path.join(outDir, 'manifest.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), images }, null, 2)}\n`,
    'utf8',
  );
  log(`完成：${Object.keys(images).length} 张 · 合计 ${(totalBytes / 1024 / 1024).toFixed(2)} MB → ${path.relative(ROOT, outDir)}`);
}

main().catch((error) => {
  log(`FATAL ${error.message}`);
  process.exitCode = 1;
});
